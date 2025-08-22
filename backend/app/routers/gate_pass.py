from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime

from app.database import get_db
from app.models import GatePassSequence as GatePassSequenceModel, User
from app.schemas import (
    GatePassSequence,
    GatePassSequenceCreate,
    GatePassSequenceUpdate,
    GatePassGenerateRequest,
    GatePassGenerateResponse
)
from app.auth import get_current_user, require_role

router = APIRouter()

def get_financial_year() -> str:
    """
    Gets the current financial year in YYYY format (e.g., 2526 for April 2025 - March 2026)
    """
    now = datetime.now()
    year = now.year
    month = now.month
    
    # Financial year starts in April (month 4)
    financial_year_start = year if month >= 4 else year - 1
    financial_year_end = financial_year_start + 1
    
    # Return last two digits of start and end years (e.g., 2526 for 2025-26)
    return f"{str(financial_year_start)[-2:]}{str(financial_year_end)[-2:]}"

def get_next_sequence_number(db: Session, financial_year: str, is_returnable: bool) -> int:
    """
    Gets and increments the next sequence number for the given financial year and pass type
    """
    pass_type = "RGP" if is_returnable else "NRGP"
    
    # Try to get existing sequence record
    sequence_record = db.query(GatePassSequenceModel).filter(
        and_(
            GatePassSequenceModel.financial_year == financial_year,
            GatePassSequenceModel.pass_type == pass_type
        )
    ).first()
    
    if sequence_record:
        # Increment existing sequence
        sequence_record.current_sequence += 1
        db.commit()
        db.refresh(sequence_record)
        return sequence_record.current_sequence
    else:
        # Create new sequence record starting from 1
        new_sequence = GatePassSequenceModel(
            financial_year=financial_year,
            pass_type=pass_type,
            current_sequence=1
        )
        db.add(new_sequence)
        db.commit()
        db.refresh(new_sequence)
        return new_sequence.current_sequence

@router.post("/generate", response_model=GatePassGenerateResponse)
def generate_gate_pass_number(
    request: GatePassGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new gate pass number with auto-incrementing sequence
    """
    try:
        financial_year = get_financial_year()
        sequence_number = get_next_sequence_number(db, financial_year, request.is_returnable)
        pass_type = "RGP" if request.is_returnable else "NRGP"
        
        # Format: RAPL-[RGP|NRGP]-[FY]/[SEQ]
        gate_pass_number = f"RAPL-{pass_type}-{financial_year}/{sequence_number:03d}"
        
        return GatePassGenerateResponse(
            gate_pass_number=gate_pass_number,
            financial_year=financial_year,
            pass_type=pass_type,
            sequence_number=sequence_number
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate gate pass number: {str(e)}"
        )

@router.get("/sequences", response_model=List[GatePassSequence])
def get_all_sequences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all gate pass sequences (admin only)
    """
    # Only allow admin users to view all sequences
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can view gate pass sequences"
        )
    
    sequences = db.query(GatePassSequenceModel).all()
    return sequences

@router.get("/sequences/{financial_year}", response_model=List[GatePassSequence])
def get_sequences_by_year(
    financial_year: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get gate pass sequences for a specific financial year
    """
    sequences = db.query(GatePassSequenceModel).filter(
        GatePassSequenceModel.financial_year == financial_year
    ).all()
    return sequences

@router.put("/sequences/{sequence_id}", response_model=GatePassSequence)
def update_sequence(
    sequence_id: int,
    sequence_update: GatePassSequenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a gate pass sequence (admin only)
    """
    # Only allow admin users to update sequences
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can update gate pass sequences"
        )
    
    sequence = db.query(GatePassSequenceModel).filter(
        GatePassSequenceModel.id == sequence_id
    ).first()
    
    if not sequence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gate pass sequence not found"
        )
    
    # Update fields
    if sequence_update.current_sequence is not None:
        sequence.current_sequence = sequence_update.current_sequence
    
    db.commit()
    db.refresh(sequence)
    return sequence

@router.get("/current-year")
def get_current_financial_year():
    """
    Get the current financial year
    """
    return {"financial_year": get_financial_year()}
